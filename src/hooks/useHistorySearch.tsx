import { existsSync, promises } from "fs";
import { SearchResult, HistoryEntry } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { NotInstalledError } from "../components";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { environment } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";

const whereClauses = (terms: string[]) => {
  return terms.map((t) => `moz_places.title LIKE '%${t}%'`).join(" AND ");
};

const loadSql = async (): Promise<SqlJsStatic> => {
  const wasmBinary = await promises.readFile(path.join(environment.assetsPath, "sql.wasm"));
  return initSqlJs({ wasmBinary: wasmBinary.buffer.slice(wasmBinary.byteOffset, wasmBinary.byteOffset + wasmBinary.byteLength) as ArrayBuffer });
};

const loadDb = async (sql: SqlJsStatic): Promise<Database> => {
  const dbPath = await getHistoryDbPath();
  const fileBuffer = await promises.readFile(dbPath);
  return new sql.Database(fileBuffer);
};

const getHistoryQuery = (query?: string) => {
  const terms = query ? query.trim().split(" ") : [];
  const whereClause = terms.length > 0 ? `WHERE ${whereClauses(terms)}` : "";
  return `SELECT
            id, url, title,
            datetime(last_visit_date/1000000,'unixepoch') as lastVisited
          FROM moz_places
          ${whereClause}
          ORDER BY last_visit_date DESC LIMIT 30;`;
};

async function searchHistoryData(query: string | undefined): Promise<SearchResult<HistoryEntry>> {
  const dbPath = getHistoryDbPath();

  if (!existsSync(dbPath)) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }

  try {
    const sql = await loadSql();
    const db = await loadDb(sql);
    const inQuery = getHistoryQuery(query);
    const results = await db.exec(inQuery);

    if (results.length === 0 || !results[0]) {
      return { data: [], isLoading: false, errorView: undefined };
    }

    const cleanResults = results[0].values.map((v) => ({
      id: v[0] as number,
      url: v[1] as string,
      title: v[2] as string,
      lastVisited: new Date(v[3] as string),
    }));

    return { data: cleanResults, isLoading: false, errorView: undefined };
  } catch (error) {
    console.error("Error searching history:", error);
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }
}

export function useHistorySearch(query: string | undefined): SearchResult<HistoryEntry> {
  const [result, setResult] = useState<SearchResult<HistoryEntry>>({
    data: [],
    isLoading: true,
    errorView: undefined,
  });

  useEffect(() => {
    let cancelled = false;

    const performSearch = async () => {
      setResult(prev => ({ ...prev, isLoading: true }));
      
      try {
        const searchResult = await searchHistoryData(query);
        
        if (!cancelled) {
          setResult(searchResult);
        }
      } catch (error) {
        console.error("Search error:", error);
        if (!cancelled) {
          setResult({
            data: [],
            isLoading: false,
            errorView: <NotInstalledError />,
          });
        }
      }
    };

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [query]);

  return result;
}
