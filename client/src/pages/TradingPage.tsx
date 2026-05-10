import TradingLayout from "@/components/TradingLayout";
import TradingTerminal from "@/components/TradingTerminal";
import { useParams } from "wouter";

export default function TradingPage() {
  const params = useParams<{ symbol?: string }>();
  return (
    <TradingLayout>
      <TradingTerminal defaultSymbol={params.symbol ?? "EURUSD"} />
    </TradingLayout>
  );
}
