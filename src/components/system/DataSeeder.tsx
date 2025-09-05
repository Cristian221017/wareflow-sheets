import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database, Zap } from "lucide-react";

export default function DataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedCount, setSeedCount] = useState(1000);
  const [financeCount, setFinanceCount] = useState(200);
  const [progress, setProgress] = useState(0);
  const [lastSeedResult, setLastSeedResult] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    loadAvailableClients();
  }, []);

  const loadAvailableClients = async () => {
    setLoadingClients(true);
    try {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, transportadora_id')
        .eq('status', 'ativo')
        .order('razao_social');

      if (error) throw error;
      setAvailableClients(clientes || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load available clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSeedData = async () => {
    if (seedCount < 1 || seedCount > 10000) {
      toast.error("NFe count must be between 1 and 10,000");
      return;
    }
    
    if (financeCount < 0 || financeCount > seedCount) {
      toast.error("Financial docs count must be between 0 and NFe count");
      return;
    }

    setIsSeeding(true);
    setProgress(0);
    
    try {
      toast.info(`Starting to generate ${seedCount} NFes and ${financeCount} financial docs...`);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('generate-test-data', {
        body: { 
          count: seedCount,
          financial_docs_count: financeCount,
          cliente_id: selectedClient || undefined,
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
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Select Client (Optional)
            </label>
            <Select value={selectedClient} onValueChange={setSelectedClient} disabled={isSeeding || loadingClients}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Auto-select any available client"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-select any available client</SelectItem>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.razao_social} ({client.cnpj})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to automatically use any available client
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
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
            
            <div>
              <label htmlFor="financeCount" className="text-sm font-medium">
                Number of Financial Documents to Generate
              </label>
              <Input
                id="financeCount"
                type="number"
                min="0"
                max={seedCount}
                value={financeCount}
                onChange={(e) => setFinanceCount(parseInt(e.target.value) || 0)}
                disabled={isSeeding}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: {seedCount} (cannot exceed NFe count)
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleSeedData}
              disabled={isSeeding}
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
              <div>
                <span className="text-muted-foreground">Transportadora ID:</span>
                <code className="ml-2 text-xs bg-background px-1 rounded">
                  {lastSeedResult.transportadora_id}
                </code>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente ID:</span>
                <code className="ml-2 text-xs bg-background px-1 rounded">
                  {lastSeedResult.cliente_id}
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