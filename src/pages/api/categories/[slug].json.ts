import type { APIContext, GetStaticPaths } from "astro";
import {
	getCategoryTagIndexStaticPaths,
	type CategoryTagIndexStaticPathProps,
} from "@/services/category-page";

export const prerender: boolean = true;
export const getStaticPaths: GetStaticPaths =
	getCategoryTagIndexStaticPaths satisfies GetStaticPaths;

export function GET({
	props,
}: APIContext<CategoryTagIndexStaticPathProps>): Response {
	return new Response(JSON.stringify(props.posts), {
		headers: {
			"Cache-Control": "public, max-age=0, must-revalidate",
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}
