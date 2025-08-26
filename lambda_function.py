import os
import json
import time
import traceback
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeDeserializer

# ---------- Config (from env) ----------
REGION = os.environ.get("REGION") or os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = os.environ["TABLE_NAME"]

USER_POOL_ID = os.environ["USER_POOL_ID"]
COGNITO_DOMAIN = os.environ["COGNITO_DOMAIN"]  # hostname only, no https

TEMPLATE_REPO = os.environ["TEMPLATE_REPO"]
TEMPLATE_BRANCH = os.environ.get("TEMPLATE_BRANCH", "main")

HTTP_API_ID = os.environ.get("HTTP_API_ID")            # optional
AUTHORIZER_ID = os.environ.get("AUTHORIZER_ID")        # optional
GITHUB_TOKEN_SECRET_ARN = os.environ.get("GITHUB_TOKEN_SECRET_ARN")  # optional

# ---------- AWS clients ----------
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

amplify = boto3.client("amplify", region_name=REGION)
cognito = boto3.client("cognito-idp", region_name=REGION)
apigwv2 = boto3.client("apigatewayv2", region_name=REGION)
secrets = boto3.client("secretsmanager", region_name=REGION)

_deser = TypeDeserializer()


def ddb_unmarshal(image: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _deser.deserialize(v) for k, v in image.items()}


def log(*args):
    print("[PROVISIONER]", *args)


# ---------------- Core steps ----------------

def set_status(child_id: str, expect_statuses: List[str], new_status: str, extra_attrs: Optional[Dict[str, Any]] = None):
    """
    Conditional status transition to keep idempotency.
    """
    names = {"#s": "status"}
    values = {":ns": new_status}
    cond_parts: List[str] = []

    if not expect_statuses:
        cond_expr = "attribute_not_exists(#s)"
    else:
        # allow if status missing or in expect_statuses
        placeholders = []
        for i, s in enumerate(expect_statuses, start=1):
            key = f":e{i}"
            values[key] = s
            placeholders.append(key)
        cond_expr = f"(attribute_not_exists(#s) OR #s IN ({', '.join(placeholders)}))"

    update_expr = "SET #s = :ns"
    if extra_attrs:
        for i, (k, v) in enumerate(extra_attrs.items(), start=1):
            names[f"#a{i}"] = k
            values[f":v{i}"] = v
            update_expr += f", #a{i} = :v{i}"

    table.update_item(
        Key={"id": child_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
        ConditionExpression=cond_expr,
    )


def create_amplify_app(app_name: str, env_vars: Dict[str, str]) -> Dict[str, Any]:
    """
    Create an Amplify Hosting app (repo-connected). Returns the app dict.
    """
    params: Dict[str, Any] = {
        "name": app_name,
        "repository": TEMPLATE_REPO,
        "platform": "WEB",
        "environmentVariables": env_vars,
        # You can also pass buildSpec if you need a custom build; generally not required.
    }

    # Private repo? supply token
    if GITHUB_TOKEN_SECRET_ARN:
        secret = secrets.get_secret_value(SecretId=GITHUB_TOKEN_SECRET_ARN)
        params["oauthToken"] = secret["SecretString"]

    resp = amplify.create_app(**params)
    app = resp["app"]
    return app


def update_amplify_env(app_id: str, env_vars: Dict[str, str]):
    amplify.update_app(appId=app_id, environmentVariables=env_vars)


def start_release_job(app_id: str, branch: str):
    try:
        amplify.start_job(appId=app_id, branchName=branch, jobType="RELEASE")
    except ClientError as e:
        # Not fatal; often a config/env update triggers a build automatically
        log("start_job skipped:", e.response.get("Error", {}).get("Message"))


def create_cognito_client(client_name: str, callback_url: str, logout_url: str) -> str:
    resp = cognito.create_user_pool_client(
        UserPoolId=USER_POOL_ID,
        ClientName=client_name,
        GenerateSecret=False,
        AllowedOAuthFlowsUserPoolClient=True,
        AllowedOAuthFlows=["code"],
        AllowedOAuthScopes=["openid", "email", "profile"],
        SupportedIdentityProviders=["COGNITO"],
        CallbackURLs=[callback_url],
        LogoutURLs=[logout_url]
    )
    return resp["UserPoolClient"]["ClientId"]


def update_api_authorizer_audience(new_client_id: str):
    if not (HTTP_API_ID and AUTHORIZER_ID):
        return  # optional

    details = apigwv2.get_authorizer(apiId=HTTP_API_ID, authorizerId=AUTHORIZER_ID)
    name = details["Name"]
    id_src = details.get("IdentitySource") or ["$request.header.Authorization"]
    jwt = details.get("JwtConfiguration", {})
    issuer = jwt.get("Issuer")
    audience = jwt.get("Audience") or []

    if new_client_id in audience:
        log("Authorizer already allows this client id")
        return

    audience.append(new_client_id)

    apigwv2.update_authorizer(
        apiId=HTTP_API_ID,
        authorizerId=AUTHORIZER_ID,
        name=name,
        authorizerType="JWT",
        identitySource=id_src,
        jwtConfiguration={
            "Issuer": issuer,
            "Audience": audience
        }
    )
    log("Updated API authorizer audience with", new_client_id)


def provision_child(item: Dict[str, Any]):
    """
    The idempotent orchestration for a single child item.
    Expects fields: id, appname, createdBy, createdAt (plus optional status/url).
    """
    child_id = item["id"]
    appname = item.get("appname") or f"child-{child_id[:8]}"
    tenant_id = item.get("id")  # you can use item['id'] as tenant id or add a separate field

    # 1) Lock: REQUESTED -> PROVISIONING (or from empty)
    set_status(child_id, expect_statuses=["", "REQUESTED"], new_status="PROVISIONING")

    # 2) Create Amplify app with initial env (no client id yet)
    initial_env = {
        "NEXT_PUBLIC_TENANT_ID": str(tenant_id),
        "NEXT_PUBLIC_APP_NAME": str(appname),
        "NEXT_PUBLIC_REGION": REGION,
        "NEXT_PUBLIC_USER_POOL_ID": USER_POOL_ID,
        # leave NEXT_PUBLIC_APP_CLIENT_ID empty for the first build
        # optional:
        # "NEXT_PUBLIC_API_URL": "<your-api-if-needed>",
    }
    log("Creating Amplify app for", appname)
    app = create_amplify_app(appname, initial_env)
    app_id = app["appId"]
    default_domain = app["defaultDomain"]  # e.g. abcd.amplifyapp.com
    child_url = f"https://{default_domain}/"
    log("Amplify appId:", app_id, "defaultDomain:", default_domain)

    # 3) Create Cognito App Client for Hosted UI (callbacks to default domain)
    client_name = f"{appname}-client"
    client_id = create_cognito_client(client_name, callback_url=child_url, logout_url=child_url)
    log("Created app client:", client_id)

    # 4) Inject APP_CLIENT_ID and redeploy
    env2 = dict(initial_env)
    env2["NEXT_PUBLIC_APP_CLIENT_ID"] = client_id
    update_amplify_env(app_id, env2)
    start_release_job(app_id, TEMPLATE_BRANCH)

    # 5) (optional) Update API authorizer audiences
    try:
        update_api_authorizer_audience(client_id)
    except ClientError as e:
        # Not fatal for provisioning the child app itself
        log("Authorizer update failed:", e.response.get("Error", {}).get("Message"))

    # 6) Mark READY
    set_status(
        child_id,
        expect_statuses=["PROVISIONING"],
        new_status="READY",
        extra_attrs={"url": child_url, "appClientId": client_id, "amplifyAppId": app_id}
    )
    log("Provisioned child READY:", child_url)


# ---------------- Lambda handler ----------------

def lambda_handler(event, context):
    """
    DynamoDB Streams event handler.
    Processes INSERTs for ChildApp items where status is missing/REQUESTED.
    """
    for rec in event.get("Records", []):
        if rec.get("eventName") != "INSERT":
            continue
        new_image = rec.get("dynamodb", {}).get("NewImage")
        if not new_image:
            continue

        item = ddb_unmarshal(new_image)
        if item.get("type") != "ChildApp":
            continue

        status = str(item.get("status") or "").upper()
        if status not in ("", "REQUESTED"):
            # already processed or in progress
            continue

        try:
            provision_child(item)
        except ClientError as e:
            err = e.response.get("Error", {})
            msg = f"{err.get('Code')}: {err.get('Message')}"
            log("FAILED for id", item.get("id"), ":", msg)
            try:
                set_status(
                    item["id"],
                    expect_statuses=["PROVISIONING", "", "REQUESTED"],
                    new_status="FAILED",
                    extra_attrs={"error": msg}
                )
            except Exception:
                pass
        except Exception as e:
            msg = f"Unhandled: {str(e)}"
            log("FAILED for id", item.get("id"), ":", msg)
            log(traceback.format_exc())
            try:
                set_status(
                    item["id"],
                    expect_statuses=["PROVISIONING", "", "REQUESTED"],
                    new_status="FAILED",
                    extra_attrs={"error": msg}
                )
            except Exception:
                pass

    # stream handlers don’t need a specific return
    return {"ok": True}
S