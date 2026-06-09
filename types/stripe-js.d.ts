declare module "@stripe/stripe-js" {
  export interface Stripe {
    confirmPayment(options: {
      elements: StripeElements;
      confirmParams: { return_url: string };
      redirect?: "always" | "if_required";
    }): Promise<{ error?: { message?: string } }>;
  }

  export interface StripeElements {}

  export type StripeConstructor = (
    publishableKey: string,
    options?: object
  ) => Stripe;

  export function loadStripe(
    publishableKey: string,
    options?: object
  ): Promise<Stripe | null>;
}