import TradingLayout from "@/components/TradingLayout";
import { TradingTerminal } from "@/components/TradingTerminal";
import { useParams } from "wouter";

export default function TradingPage() {
  return (
    <TradingLayout>
      <TradingTerminal />
    </TradingLayout>
  );
}
