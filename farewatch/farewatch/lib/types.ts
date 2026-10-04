export type Offer = {
  id: string;
  total_amount: number;
  total_currency: string;
  owner?: { name?: string; iata_code?: string } | null;
  slices: Array<{
    origin?: string; destination?: string;
    departure_date?: string; arrival_date?: string;
    duration?: string;
    segments: Array<{
      marketing_carrier?: string; flight_number?: string;
      departing_at?: string; arriving_at?: string;
      origin?: string; destination?: string;
    }>;
  }>;
};

export type SearchResponse = {
  configured: boolean;
  error?: string;
  hint?: string;
  request_id?: string | null;
  offer_count?: number;
  cheapest?: Offer | null;
  offers?: Offer[];
  persisted?: { search_id: string | null; price_point_id: number | null };
  disclaimer?: string;
};
