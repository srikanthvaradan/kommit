/**
 * @file types/stripe.d.ts
 * @description Minimal ambient type declaration for the `stripe` package,
 * used to satisfy TypeScript when the package is not yet installed in node_modules.
 * Replace with the actual `stripe` npm package for production use.
 */

declare module "stripe" {
  namespace Stripe {
    interface PaymentIntentCreateParams {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
      [key: string]: any;
    }

    interface PaymentIntent {
      id: string;
      object: "payment_intent";
      amount: number;
      currency: string;
      client_secret: string | null;
      metadata: Record<string, string>;
      status: string;
      [key: string]: any;
    }

    interface PaymentIntentsResource {
      create(params: PaymentIntentCreateParams): Promise<PaymentIntent>;
    }

    interface ConstructorOptions {
      apiVersion?: string;
      [key: string]: any;
    }
  }

  class Stripe {
    paymentIntents: Stripe.PaymentIntentsResource;
    constructor(secretKey: string, options?: Stripe.ConstructorOptions);
  }

  export = Stripe;
}