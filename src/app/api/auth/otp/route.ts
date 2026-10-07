import { z } from "zod";
import { requestOtp } from "@/lib/auth";
import { jsonHandler } from "@/lib/api-route";

const schema = z.object({ phone: z.string().min(10) });

export async function POST(request: Request) {
  return jsonHandler(
    request,
    async () => {
      const body = schema.parse(await request.json());
      return requestOtp(body.phone);
    },
    { auth: false },
  );
}
