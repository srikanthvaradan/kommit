declare module "@stripe/react-stripe-js" {
  import { Stripe, StripeElements } from "@stripe/stripe-js";
  import * as React from "react";

  export interface ElementsProps {
    stripe: Promise<Stripe | null> | Stripe | null;
    options?: {
      clientSecret?: string;
      [key: string]: unknown;
    };
    children?: React.ReactNode;
  }

  export function Elements(props: ElementsProps): JSX.Element;

  export interface PaymentElementProps {
    [key: string]: unknown;
  }

  export function PaymentElement(props?: PaymentElementProps): JSX.Element;

  export function useStripe(): Stripe | null;
  export function useElements(): StripeElements | null;
}