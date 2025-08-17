import { AddBetForm } from "@/components/add-bet-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddBetPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add a New Bet</h2>
      </div>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Log a Bet</CardTitle>
                <CardDescription>Enter the details of your bet below.</CardDescription>
            </CardHeader>
            <CardContent>
                <AddBetForm />
            </CardContent>
        </Card>
      </div>
    </>
  );
}
