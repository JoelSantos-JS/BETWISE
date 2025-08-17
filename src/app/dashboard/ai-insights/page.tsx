import { AIInsights } from "@/components/ai-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIInsightsPage() {
  return (
    <>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI-Powered Insights</h2>
        <p className="text-muted-foreground">
          Let our AI analyze your betting history to find patterns and suggest improvements.
        </p>
      </div>
      <div className="mt-6">
        <AIInsights />
      </div>
    </>
  );
}
