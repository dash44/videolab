import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const region = process.env.AWS_REGION || "ap-southeast-2";
const sm = new SecretsManagerClient({ region });

export async function getSecret(name, { parseJson = true } = {}) {
    const out = await sm.send(new GetSecretValueCommand({ SecretId: name }));
    let val = out.SecretString;
    if (!val && out.SecretBinay) {
        val = Buffer.from(out.SecretBinary, "base64").toString("utf-8");
    }
    if (parseJson && val && /^[{]/.test(val.trim())) {
        try { return JSON.parse(val); } catch {}
    }
    return val;
}
