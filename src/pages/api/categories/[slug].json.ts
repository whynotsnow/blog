import type { APIContext, GetStaticPaths } from "astro";
import {
	getCategoryTagIndexStaticPaths,
	type CategoryTagIndexStaticPathProps,
} from "@/services/category-page";

export const prerender = true;
export const getStaticPaths =
	getCategoryTagIndexStaticPaths satisfies GetStaticPaths;

export function GET({ props }: APIContext<CategoryTagIndexStaticPathProps>) {
	return new Response(JSON.stringify(props.posts), {
		headers: {
			"Cache-Control": "public, max-age=0, must-revalidate",
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}
