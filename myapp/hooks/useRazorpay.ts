import { useEffect } from "react";

export function useRazorpay() {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const processPayment = async (
        orderOptions: { tier: string },
        onSuccess: (response: any) => void,
        onError: (error: any) => void
    ) => {
        try {
            const token = localStorage.getItem("auraa_token");
            if (!token) throw new Error("Please log in to upgrade.");

            // 1. Create order
            const res = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify(orderOptions)
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to create order");
            }
            
            const orderData = await res.json();
            
            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "AURAA",
                description: `Upgrade to ${orderOptions.tier.toUpperCase()} Tier`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch("/api/payments/verify", {
                            method: "POST",
                            headers: { 
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}` 
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                tier: orderOptions.tier
                            })
                        });
                        
                        if (verifyRes.ok) {
                            onSuccess(response);
                        } else {
                            throw new Error("Payment verification failed");
                        }
                    } catch (err) {
                        onError(err);
                    }
                },
                theme: {
                    color: "#6366f1" // Indigo 500
                }
            };
            
            // @ts-ignore
            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                onError(response.error);
            });
            rzp1.open();
            
        } catch (err) {
            onError(err);
        }
    };

    return { processPayment };
}
