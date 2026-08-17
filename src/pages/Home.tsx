import { LayoutProvider } from "@/lib/layout";
import { MarketProvider } from "@/lib/market-context";
import { Topbar } from "@/components/Topbar";
import { StatusBar } from "@/components/StatusBar";
import { Grid, type TileDef } from "@/components/Grid";
import { ChartTile } from "@/components/tiles/ChartTile";
import { ClocksTile } from "@/components/tiles/ClocksTile";
import { IndicesTile } from "@/components/tiles/IndicesTile";
import { HeatmapTile } from "@/components/tiles/HeatmapTile";
import { MetalsTile } from "@/components/tiles/MetalsTile";
import { StripTile } from "@/components/tiles/StripTile";
import { MoversTile } from "@/components/tiles/MoversTile";
import { WatchlistTile } from "@/components/tiles/WatchlistTile";

const DEFS: TileDef[] = [
  { id: "chart", span: 8, title: "AAPL · 60 SESSIONS", meta: "APPLE INC · NASDAQ · 1D BARS", render: () => <ChartTile /> },
  { id: "clocks", span: 4, title: "WORLD SESSION CLOCKS", meta: "LOCAL EXCHANGE TIME", render: () => <ClocksTile /> },
  { id: "indices", span: 5, title: "GLOBAL INDICES", meta: "1D BARS · PTS", render: () => <IndicesTile /> },
  { id: "heatmap", span: 7, title: "SECTOR HEATMAP", meta: "AI · ENERGY · FINANCIALS", render: () => <HeatmapTile /> },
  { id: "metals", span: 12, title: "PRECIOUS METALS", meta: "FUTURES · USD/OZ", render: () => <MetalsTile /> },
  { id: "fx", span: 4, title: "FX MAJORS", meta: "SPOT · 1D", render: () => <StripTile group="fx" /> },
  { id: "commodities", span: 4, title: "COMMODITIES", meta: "FUTURES · 1D", render: () => <StripTile group="commodities" /> },
  { id: "crypto", span: 4, title: "CRYPTO", meta: "USD · 1D", render: () => <StripTile group="crypto" /> },
  { id: "movers", span: 5, title: "MOVERS", meta: "EQUITY UNIVERSE · 1D", render: () => <MoversTile /> },
  { id: "watchlist", span: 7, title: "WATCHLIST", meta: "MYSQL · TRPC", render: () => <WatchlistTile /> },
];

export default function Home() {
  return (
    <MarketProvider>
      <LayoutProvider allIds={DEFS.map((d) => d.id)}>
        <div className="app-shell">
          <Topbar defs={DEFS} />
          <Grid defs={DEFS} />
          <StatusBar />
        </div>
      </LayoutProvider>
    </MarketProvider>
  );
}
