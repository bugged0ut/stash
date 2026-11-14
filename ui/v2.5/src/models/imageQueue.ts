import { FilterMode } from "src/core/generated-graphql";
import { ListFilterModel } from "./list-filter/filter";

// Carries the image list filter (and the current page's ids) onto the
// image details page so navigation can continue onto the next page.
export class ImageQueue {
  public query?: ListFilterModel;
  public imageIDs?: string[];

  public static fromListFilterModel(filter: ListFilterModel) {
    const ret = new ImageQueue();
    ret.query = filter.clone();
    return ret;
  }

  public static fromQueryParameters(params: URLSearchParams) {
    const ret = new ImageQueue();

    if (params.has("qfp")) {
      const translated = {
        sortby: params.get("qsort"),
        sortdir: params.get("qsortd"),
        q: params.get("qfq"),
        p: params.get("qfp"),
        perPage: params.get("qperpage"),
        c: params.getAll("qfc"),
      };
      const decoded = ListFilterModel.decodeParams(translated);
      const query = new ListFilterModel(FilterMode.Images);
      query.configureFromDecodedParams(decoded);
      ret.query = query;
    }

    if (params.has("qs")) {
      ret.imageIDs = params.getAll("qs");
    }

    return ret;
  }

  public makeQueryParameters(page?: number, imageIDs?: string[]) {
    const ret: string[] = [];

    if (this.query) {
      const queryParams = this.query.getEncodedParams();

      if (queryParams.sortby) {
        ret.push(`qsort=${queryParams.sortby}`);
      }
      if (queryParams.sortdir) {
        ret.push(`qsortd=${queryParams.sortdir}`);
      }
      if (queryParams.q) {
        ret.push(`qfq=${queryParams.q}`);
      }
      for (const c of queryParams.c ?? []) {
        ret.push(`qfc=${c}`);
      }

      const qfp =
        page !== undefined
          ? String(page)
          : queryParams.p ?? String(this.query.currentPage);
      ret.push(`qfp=${qfp}`);
      ret.push(`qperpage=${this.query.itemsPerPage}`);
    }

    const ids = imageIDs ?? this.imageIDs;
    if (ids) {
      for (const id of ids) {
        ret.push(`qs=${id}`);
      }
    }

    return ret.join("&");
  }

  public makeLink(imageID: string, page?: number, imageIDs?: string[]) {
    const params = this.makeQueryParameters(page, imageIDs);
    return `/images/${imageID}${params ? `?${params}` : ""}`;
  }
}
