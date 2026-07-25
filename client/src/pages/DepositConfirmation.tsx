import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DepositConfirmationState {
  transactionId: string;
  amount: number;
  currency: string;
  amountInKSH: number;
  phoneNumber: string;
  timestamp: number;
}

export default function DepositConfirmation() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<DepositConfirmationState | null>(null);
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");

  // Get transaction details from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txnId = params.get("txnId");
    const amount = params.get("amount");
    const currency = params.get("currency") || "USD";
    const phoneNumber = params.get("phone");

    if (!txnId || !amount) {
      setLocation("/wallets");
      return;
    }

    const amountNum = parseFloat(amount);
    const amountInKSH = Math.round(amountNum * 130);

    setState({
      transactionId: txnId,
      amount: amountNum,
      currency,
      amountInKSH,
      phoneNumber: phoneNumber || "",
      timestamp: Date.now(),
    });
  }, [setLocation]);

  // Poll transaction status
  const { data: transactions } = trpc.account.transactions.useQuery(
    { limit: 100 },
    { refetchInterval: 3000 } // Poll every 3 seconds
  );

  const transaction = transactions?.find((t) => t.reference === state?.transactionId);

  useEffect(() => {
    if (transaction) {
      if (transaction.status === "completed") {
        setStatus("completed");
      } else if (transaction.status === "failed") {
        setStatus("failed");
      }
    }
  }, [transaction?.id]);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "completed" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-serif">Payment Confirmed!</CardTitle>
              <CardDescription>Your deposit has been successfully processed</CardDescription>
            </>
          )}
          {status === "pending" && (
            <>
              <div className="flex justify-center mb-4">
                <Clock className="w-16 h-16 text-blue-500 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-serif">Payment Processing</CardTitle>
              <CardDescription>Waiting for payment confirmation...</CardDescription>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-serif">Payment Failed</CardTitle>
              <CardDescription>Your payment could not be processed</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transaction Details */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-sm">{state.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">${state.amount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount in KSH</span>
              <span className="font-semibold">{state.amountInKSH} KSH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-mono text-sm">{state.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="text-sm">{new Date(state.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-semibold ${
                status === "completed" ? "text-green-600" :
                status === "failed" ? "text-red-600" :
                "text-blue-600"
              }`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {status === "pending" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Payment in Progress</p>
              <p>We're waiting for the payment confirmation from PalPluss. This usually takes a few seconds.</p>
              <p className="mt-2 text-xs">Auto-refreshing every 3 seconds...</p>
            </div>
          )}

          {status === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-semibold mb-2">Success!</p>
              <p>{state.amountInKSH} KSH has been credited to your wallet. You can now start trading.</p>
            </div>
          )}

          {status === "failed" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-2">Payment Failed</p>
              <p>The payment could not be processed. Your wallet has not been charged. Please try again.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/wallets")}
            >
              Back to Wallets
            </Button>
            {status === "completed" && (
              <Button
                className="flex-1"
                onClick={() => setLocation("/trade")}
              >
                Start Trading
              </Button>
            )}
            {status === "failed" && (
              <Button
                className="flex-1"
                onClick={() => setLocation("/wallets")}
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground text-center">
            Transaction ID: {state.transactionId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
