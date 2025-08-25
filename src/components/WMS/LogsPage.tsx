import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity } from 'lucide-react';

export default function LogsPage() {
  const queryClient = useQueryClient();
  const once = useRef(false);

  // Configurar realtime para logs com guard
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    console.log('🔄 Configurando realtime para logs');
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Event Logs
        </CardTitle>
        <CardDescription>
          Monitore todos os eventos do sistema (em desenvolvimento)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Tela de logs em desenvolvimento</p>
        </div>
      </CardContent>
    </Card>
  );
}