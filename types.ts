
export interface ChartData {
  type: 'bar' | 'line';
  data: Array<{
    name: string;
    [key: string]: number | string;
  }>;
  dataKey: string;
}

export interface SolveResult {
  solution: string;
  explanation: string;
  chartData?: ChartData;
}

export interface SearchResult {
    answer: string;
    sources: Array<{
        uri: string;
        title: string;
    }>;
}

export interface TranscriptionEntry {
  speaker: 'user' | 'model';
  text: string;
}
