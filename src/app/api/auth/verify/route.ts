import { z } from "zod";
import { verifyOtp } from "@/lib/auth";
import { jsonHandler } from "@/lib/api-route";

const schema = z.object({ phone: z.string().min(10), code: z.string().min(4) });

export async function POST(request: Request) {
  return jsonHandler(
    request,
    async () => {
      const body = schema.parse(await request.json());
      return verifyOtp(body.phone, body.code);
    },
    { auth: false },
  );
}
