'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Mail, Clock, TrendingUp, Package, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ResultsTable } from '@/components/ResultsTable';
import type { ArbitrageDeal } from '@/types';

interface CronResult {
  success: boolean;
  timestamp: string;
  scanDuration: number;
  totalDeals: number;
  dealsWithMinRoi: number;
  minRoiFilter: number;
  email: {
    success: boolean;
    message: string;
    filteredCount: number;
  };
  categories: string[];
  deals: ArbitrageDeal[];
  error?: string;
  message?: string;
  skipped?: boolean;
}

export default function ResultsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Führe Cron-Scan manuell aus
  const runCronScan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cron');
      const data = await response.json();
      
      if (data.success) {
        // Konvertiere timestamp strings zu Date objects
        const dealsWithDates = (data.deals || []).map((d: any) => ({
          ...d,
          timestamp: d.timestamp ? new Date(d.timestamp) : new Date()
        }));
        setResult({ ...data, deals: dealsWithDates });
        setLastUpdate(new Date());
      } else if (data.skipped) {
        setError(data.message || 'Scan wurde übersprungen (außerhalb der Betriebszeiten 8-21 Uhr)');
      } else {
        setError(data.error || data.message || 'Unbekannter Fehler');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  // Berechne Stats
  const stats = result ? {
    totalDeals: result.totalDeals,
    highRoiDeals: result.dealsWithMinRoi,
    avgRoi: result.deals.length > 0 
      ? result.deals.reduce((acc, d) => acc + d.roi, 0) / result.deals.length 
      : 0,
    potentialProfit: result.deals.reduce((acc, d) => acc + (d.profitAfterFees > 0 ? d.profitAfterFees : 0), 0)
  } : null;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Scan Ergebnisse</h1>
          <p className="text-slate-400 mt-1">
            Automatischer Arbitrage-Scan • 8:00 - 21:00 Uhr alle 2 Stunden
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={runCronScan} 
            isLoading={isLoading}
            className="shadow-lg shadow-blue-500/20"
          >
            {isLoading ? 'Scanne...' : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Jetzt scannen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-slate-800 bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Gesamt Deals</p>
              <Package className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.totalDeals || 0}</p>
          </div>
          
          <div className="rounded-xl border border-slate-800 bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">ROI ≥ {result.minRoiFilter}%</p>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{stats?.highRoiDeals || 0}</p>
          </div>
          
          <div className="rounded-xl border border-slate-800 bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Ø ROI</p>
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.avgRoi.toFixed(0) || 0}%</p>
          </div>
          
          <div className="rounded-xl border border-slate-800 bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Scan-Zeit</p>
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{result.scanDuration}s</p>
          </div>
        </div>
      )}

      {/* E-Mail Status */}
      {result?.email && (
        <div className={`rounded-xl border p-4 mb-6 flex items-center gap-3 ${
          result.email.success 
            ? 'border-emerald-500/30 bg-emerald-500/10' 
            : 'border-amber-500/30 bg-amber-500/10'
        }`}>
          {result.email.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <Mail className="h-5 w-5 text-amber-400" />
          )}
          <div>
            <p className={`font-medium ${result.email.success ? 'text-emerald-400' : 'text-amber-400'}`}>
              {result.email.success ? 'E-Mail gesendet' : 'E-Mail Status'}
            </p>
            <p className="text-sm text-slate-400">
              {result.email.message}
              {result.email.success && ` (${result.email.filteredCount} Deals mit ROI ≥ ${result.minRoiFilter}%)`}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 mb-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Kategorien Info */}
      {result?.categories && (
        <div className="mb-6">
          <p className="text-sm text-slate-500">
            <span className="text-slate-400">Gescannte Kategorien:</span>{' '}
            {result.categories.join(' • ')}
          </p>
        </div>
      )}

      {/* Results Table */}
      {result?.deals && result.deals.length > 0 ? (
        <ResultsTable deals={result.deals} />
      ) : result ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-surface/30 p-12 text-center">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Keine Deals gefunden</h3>
          <p className="text-slate-400">
            Der Scan hat keine Ergebnisse geliefert. Versuche es später erneut.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-surface/30 p-12 text-center">
          <RefreshCw className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Starte einen Scan</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Klicke auf "Jetzt scannen" um den Arbitrage-Scan manuell zu starten.
            Automatische Scans laufen alle 2 Stunden von 8:00 bis 21:00 Uhr.
          </p>
          <Button onClick={runCronScan} isLoading={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Jetzt scannen
          </Button>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-center text-sm text-slate-500 mt-6">
          Letztes Update: {lastUpdate.toLocaleString('de-DE')}
        </p>
      )}
    </Layout>
  );
}

