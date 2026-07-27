"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MethodologyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Methodology</h2>
        <p className="text-muted-foreground mt-1">
          Econometric methods and data sources used by MacroPulse.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">OLS Market Model</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The event study uses an OLS market model to estimate expected returns:
          </p>
          <pre className="bg-muted p-3 rounded-md text-xs font-mono">
            R(t) = alpha + beta * R_m(t) + epsilon(t)
          </pre>
          <p>
            where R(t) is the security return, R_m(t) is the benchmark return
            (default: S&amp;P 500), alpha is the intercept, and beta is the
            market sensitivity. The estimation window defaults to 252 trading
            days ending 30 days before the event.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Abnormal Returns (AR)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Abnormal returns are the difference between actual and expected
            returns during the event window:
          </p>
          <pre className="bg-muted p-3 rounded-md text-xs font-mono">
            AR(t) = R(t) - [alpha_hat + beta_hat * R_m(t)]
          </pre>
          <p>
            The CAR (Cumulative Abnormal Return) is the sum of ARs across the
            event window, typically [-5, +5] trading days around the event.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Patell Z-Score Significance Test</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The Patell (1976) test assesses whether the CAR is significantly
            different from zero. It uses estimation-window residuals to
            estimate the variance of prediction errors:
          </p>
          <pre className="bg-muted p-3 rounded-md text-xs font-mono">
{`Var(AR_t) = sigma_est^2 * (1 + 1/N_est + (R_m(t) - R_bar)^2 / S_xx)
Z = CAR_total / sqrt(sum of Var(AR_t))
p-value = 2 * (1 - Phi(|Z|))`}
          </pre>
          <p>
            A p-value below 0.05 indicates the CAR is statistically significant
            at the 5% level, suggesting the event had a measurable market
            impact beyond normal market noise.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">FX &amp; Correlation Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The flow analysis engine computes rolling correlations between
            equity returns and the ICE US Dollar Index (DX-Y.NYB), Gold/SPY
            price ratio (safe-haven demand proxy), and VIX-equity correlation.
          </p>
          <p>
            Pre-event and post-event correlation means are compared to detect
            regime shifts. A significant change in correlation structure
            indicates altered institutional flow patterns around the event.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sector Sensitivity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Sector betas are estimated via OLS against the S&amp;P 500 for all
            11 SPDR sector ETFs (XLK, XLF, XLV, XLE, XLI, XLY, XLP, XLU,
            XLRE, XLB, XLC). Event-day CARs per sector reveal which sectors
            were most impacted.
          </p>
          <p>
            The cross-sector correlation matrix shows co-movement patterns. A
            spike in correlation during the event window suggests risk-off or
            factor-driven trading.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Market data:</strong> Yahoo Finance (yfinance) for equity
            prices, ETF prices, VIX, and Dollar Index.
          </p>
          <p>
            <strong>Macro indicators:</strong> FRED (Federal Reserve Economic
            Data) via fredapi for Fed funds rate, Treasury yields, CPI, and
            unemployment.
          </p>
          <p>
            <strong>Event registry:</strong> 20 curated US macro events
            (2020-2025) covering Fed decisions, tariff actions, elections,
            banking crises, and exogenous shocks.
          </p>
          <p>
            <strong>Caching:</strong> SQLite cache with 1-day TTL for market
            data to reduce API calls.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
