import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database, Zap } from "lucide-react";

export default function DataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedCount, setSeedCount] = useState(1000);
  const [progress, setProgress] = useState(0);
  const [lastSeedResult, setLastSeedResult] = useState<any>(null);

  const handleSeedData = async () => {
    if (seedCount < 1 || seedCount > 10000) {
      toast.error("Count must be between 1 and 10,000");
      return;
    }

    setIsSeeding(true);
    setProgress(0);
    
    try {
      toast.info(`Starting to generate ${seedCount} test records...`);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('generate-test-data', {
        body: { 
          count: seedCount,
          // Let the function find available transportadora and cliente
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw error;
      }

      if (data?.success) {
        setLastSeedResult(data.data);
        toast.success(`✅ Successfully generated ${data.data.nfs_created} NFs and ${data.data.financial_docs_created} financial documents!`);
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Seeding error:', error);
      toast.error(`❌ Seeding failed: ${error.message}`);
      setProgress(0);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Test Data Generator</CardTitle>
        </div>
        <CardDescription>
          Generate realistic test data for stress testing the system with large datasets.
          This will create NFe records, financial documents, and related data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="seedCount" className="text-sm font-medium">
              Number of NFe Records to Generate
            </label>
            <Input
              id="seedCount"
              type="number"
              min="1"
              max="10000"
              value={seedCount}
              onChange={(e) => setSeedCount(parseInt(e.target.value) || 1000)}
              disabled={isSeeding}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 1000+ for performance testing
            </p>
          </div>
          
          <Button 
            onClick={handleSeedData}
            disabled={isSeeding}
            className="mt-6"
            size="lg"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Data
              </>
            )}
          </Button>
        </div>

        {isSeeding && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {lastSeedResult && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Badge variant="secondary">Last Generation Result</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">NFe Records:</span>
                <span className="font-medium ml-2">{lastSeedResult.nfs_created}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Financial Docs:</span>
                <span className="font-medium ml-2">{lastSeedResult.financial_docs_created}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Transportadora ID:</span>
                <code className="ml-2 text-xs bg-background px-1 rounded">
                  {lastSeedResult.transportadora_id}
                </code>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Production Warning
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            This tool is for testing only. Do not use in production with real client data.
            Generated data includes realistic but fake CNPJs, company names, and financial values.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}