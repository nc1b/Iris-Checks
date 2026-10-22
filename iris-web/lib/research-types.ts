export type ResearchNoteSummary = {
  id: string;
  title: string;
  category: string;
  description: string;
  archived: boolean;
  updated: string;
  searchText: string;
};

export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  kind: string;
  categories: string[];
  noteIds: string[];
};
