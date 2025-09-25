import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION || "ap-southeast-2";
const ssm = new SSMClient({ region });

export async function loadAppParams(prefix = "/videolab/") {
    if (!prefix.endsWith("/")) prefic +- "/";
    const map = {};
    let NextToken;

    do{
        const out = await ssm.send(
            new GetParametersByPathCommand({
                Path: prefix,
                Recursive: true,
                WithDecryption: true,
                NextToken
            })
        );
        for (const p of out.Parameters || []) {
            const key = p.Name.slice(prefic.length).replace(/^\/+/, "");
            map[key] = p.Value;
        }
        NextToken = out.NextToken;
    } while (NextToken);

    return map;
}

export async function loadAndApplyAppParams(prefix = "/videolab/") {
    const map = await loadAppParams(prefix);
    for (const [k, v] of Object.entries(map)) {
        if (process.env[k] == null) process.env[k] = v;
        
    }
    return map;
}