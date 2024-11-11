import { OrderConfirmation } from "@/components/emails/OrderConfirmation";
import { ShippingConfirmation } from "@/components/emails/ShippingConfirmation";
import { DeliveredNotification } from "@/components/emails/DeliveredNotification";
import { Resend } from "resend";
import { NextRequest } from "next/server";
import { EmailType } from "@/lib/sharedTypes";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailTemplate = () => JSX.Element;

const EMAIL_TEMPLATES: Record<EmailType, EmailTemplate> = {
  [EmailType.ORDER_CONFIRMED]: OrderConfirmation,
  [EmailType.SHIPPING_CONFIRMED]: ShippingConfirmation,
  [EmailType.DELIVERY_CONFIRMED]: DeliveredNotification,
};

interface EmailRequestBody {
  customerEmail: string;
  emailSubject: string;
  emailType: EmailType;
}

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, emailSubject, emailType } =
      (await request.json()) as EmailRequestBody;

    const Template = EMAIL_TEMPLATES[emailType];
    if (!Template) {
      return Response.json({ error: "Invalid email type" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: customerEmail,
      subject: emailSubject,
      react: Template(),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}