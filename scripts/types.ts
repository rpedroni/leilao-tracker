// Shared types for leilão tracker

export interface Property {
  id: string;
  tipo: string;
  bairro: string;
  endereco: string;
  lance: number;
  avaliacao: number | null;
  desconto: number | null;
  modalidade: string;
  encerramento: string | null;
  ocupacao: string;
  area?: string;
  fonte: string;
  link: string;
  novo?: boolean;
  prioridade?: boolean;
  /** True when listing explicitly excludes parking (e.g. Caixa "Sem Direito ao Uso Das Vagas") */
  semVagas?: boolean;
  /** Warnings/red flags detected during scraping */
  alertas?: string[];
  /** Number of bedrooms */
  quartos?: number;
  /** Number of garage spots */
  vagas?: number;
  /** Price per m² */
  precoM2?: number;
  /** Neighborhood avg R$/m² for comparison */
  mediaM2Bairro?: number;
  /** Real discount vs market R$/m² */
  descontoReal?: number;
  /** Deal quality score 0-100 */
  score?: number;
  /** Score breakdown explanation */
  scoreBreakdown?: string;
}

// ⚠️ ONLY these 7 neighborhoods allowed per group rules (updated Feb 15, 2026)
// Removed: Portão, Água Verde, Bigorrilho, Alto da XV, Hugo Lange, Juvevê, Rebouças, Cristo Rei, Boa Vista, Bacacheri
// Added: Mercês, Jardim das Américas
export const PRIORITY_NEIGHBORHOODS = [
  'Batel',
  'Cabral',
  'Mercês',
  'Tarumã',
  'Jardim das Américas',
  'Jardim Social',
  'Centro'  // Curitiba only, NOT "Centro de SJP"
];

export const GRANDE_CURITIBA = [
  'Almirante Tamandaré', 'Araucária', 'Campo Largo', 
  'Colombo', 'Fazenda Rio Grande', 'Pinhais', 'São José dos Pinhais'
];

export const MIN_DISCOUNT = 40; // %
export const MAX_PRICE = 800000; // R$
