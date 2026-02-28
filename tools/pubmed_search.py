"""PubMed/NCBI E-utilities API tool for searching medical research papers."""

import requests
import xml.etree.ElementTree as ET
from utils.helpers import clean_text, truncate_to_tokens

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


def search_pubmed(query: str, max_results: int = 5) -> str:
    """Search PubMed for research papers and return condensed results.
    
    Args:
        query: Search query (e.g., "hypertension treatment South Asian population")
        max_results: Maximum number of papers to return (default 5)
    
    Returns:
        Formatted string with paper titles, abstracts, and metadata.
    """
    try:
        # Step 1: Search for PMIDs
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmax": max_results,
            "retmode": "json",
            "sort": "relevance",
        }
        search_resp = requests.get(ESEARCH_URL, params=search_params, timeout=15)
        search_resp.raise_for_status()
        search_data = search_resp.json()

        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return f"No PubMed results found for query: {query}"

        # Step 2: Fetch article details
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "xml",
            "rettype": "abstract",
        }
        fetch_resp = requests.get(EFETCH_URL, params=fetch_params, timeout=15)
        fetch_resp.raise_for_status()

        # Step 3: Parse XML and extract key fields
        root = ET.fromstring(fetch_resp.text)
        papers = []

        for article in root.findall(".//PubmedArticle"):
            try:
                # Title
                title_el = article.find(".//ArticleTitle")
                title = title_el.text if title_el is not None and title_el.text else "No title"

                # PMID
                pmid_el = article.find(".//PMID")
                pmid = pmid_el.text if pmid_el is not None else ""

                # Year
                year_el = article.find(".//PubDate/Year")
                year = year_el.text if year_el is not None else ""

                # Journal
                journal_el = article.find(".//Journal/Title")
                journal = journal_el.text if journal_el is not None else ""

                # Abstract - get first 150 words
                abstract_parts = []
                for abs_text in article.findall(".//AbstractText"):
                    if abs_text.text:
                        abstract_parts.append(clean_text(abs_text.text))
                abstract = " ".join(abstract_parts)
                abstract_words = abstract.split()
                if len(abstract_words) > 150:
                    abstract = " ".join(abstract_words[:150]) + "..."

                # Authors (first 3)
                authors = []
                for author in article.findall(".//Author")[:3]:
                    last = author.find("LastName")
                    init = author.find("Initials")
                    if last is not None and last.text:
                        name = last.text
                        if init is not None and init.text:
                            name += f" {init.text}"
                        authors.append(name)
                author_str = ", ".join(authors)
                if len(article.findall(".//Author")) > 3:
                    author_str += " et al."

                papers.append(
                    f"**Paper (PMID: {pmid})**\n"
                    f"Title: {title}\n"
                    f"Authors: {author_str}\n"
                    f"Journal: {journal} ({year})\n"
                    f"Abstract: {abstract}\n"
                )
            except Exception:
                continue

        if not papers:
            return f"Found {len(id_list)} PMIDs but could not parse article details."

        result = f"Found {len(papers)} relevant papers for: {query}\n\n" + "\n---\n".join(papers)
        return truncate_to_tokens(result, 2500)

    except requests.RequestException as e:
        return f"PubMed API error: {str(e)}"
    except Exception as e:
        return f"Error searching PubMed: {str(e)}"


# Tool definition for the LLM
TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "search_pubmed",
        "description": (
            "Search PubMed medical research database for relevant papers. "
            "Use this to find research about conditions, treatments, drug efficacy, "
            "and population-specific studies. Include ethnicity/population terms in the query "
            "for ethnicity-specific results."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for PubMed (e.g., 'metformin efficacy South Asian type 2 diabetes')",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of papers to return (1-10, default 5)",
                },
            },
            "required": ["query"],
        },
    },
}
