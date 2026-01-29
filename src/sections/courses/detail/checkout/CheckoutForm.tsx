"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { User } from "next-auth";
import PaymentButton from "../../checkout/PaymentButton";
import { Course } from "@/hooks/use-course";
import { useTranslations } from "next-intl";

// Define form schema with Zod
const checkoutFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  paymentMethod: z.enum(["midtrans"])
    .describe("Please select a payment method"),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

interface CheckoutFormProps {
  course: Course | undefined; // You can type this properly based on your Course model
  user: User | undefined;
}

export function CheckoutForm({ course, user }: CheckoutFormProps) {
  const t = useTranslations("checkout");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values from user (if available)
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      paymentMethod: "midtrans",
    },
  });

  // Form submission handler
  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      // The actual payment will be handled by the PaymentButton component
      // This form submission just validates the fields

      // Clear form errors if any
      form.clearErrors();

      // Show the payment button (handled in the JSX below)
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t("processing_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get form values to check if form is valid
  const { formState } = form;
  const isFormValid = formState.isValid;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name_label")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("name_placeholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email_label")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("email_placeholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Payment Method Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("payment_method_label")}</h3>

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="space-y-3"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="midtrans" id="midtrans" />
                      </FormControl>
                      <FormLabel
                        htmlFor="midtrans"
                        className="font-normal cursor-pointer"
                      >
                        {t("payment_method_midtrans")}
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment Details - Dynamic based on selected payment method */}
        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="text-sm text-blue-700">
                <p>{t("payment_notice")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="pt-4">
          {/* Use our custom PaymentButton component instead of a regular submit button */}
          {isFormValid ? (
            <PaymentButton
              courseId={course?.id}
              price={course?.price || 0}
              label="Complete Payment"
              className="w-full h-12"
              disabled={isSubmitting}
            />
          ) : (
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("submitting") : t("submit_button")}
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("terms_notice")}
          </p>
        </div>
      </form>
    </Form>
  );
}
