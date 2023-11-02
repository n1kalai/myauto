import React, { useMemo, useRef, useState } from "react";
import {
	QueryClient,
	dehydrate,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import Head from "next/head";

import { BreadCrumb } from "@/components/BreadCrumbs";

import { getCount } from "@/services/getCount";
import { ParsedUrlQuery } from "querystring";

import { ProductHeader } from "@/components/Product/ProductHeader";
import { SearchTypes } from "@/types/searchTypes";

import { getProducts } from "@/services/getProducts";

import FiltersContainer from "@/components/filters/FiltersContainer";
import { useRouter } from "next/router";
import { Card } from "@/components/Product/Card";

const defaultQueries = {
	TypeID: 0,
	CurrencyID: 3,
};

function getPreviousPageParam(pageData, allPages) {
	// Calculate the parameter for the previous page
	console.log("pageData", pageData);
	console.log("allPages", allPages);
	const currentPageIndex = allPages.findIndex((page) => page === pageData);
	if (currentPageIndex > 0) {
		return allPages[currentPageIndex - 1].cursor; // Assuming there is a 'cursor' field in your data
	}
	return null; // Return null if there are no more previous pages
}

const Home = ({ query }: { query: ParsedUrlQuery }) => {
	const [search, setSearch] = useState<SearchTypes>({
		...defaultQueries,
		...query,
	});

	const { query: browserQuery } = useRouter();

	const pageRef = useRef(0);

	const searchAndQuery = useMemo(() => {
		return {
			...search,
			...query,
			...browserQuery,
		};
	}, [browserQuery]);

	const queryKey = ["prods", searchAndQuery];

	const {
		data: products,
		fetchNextPage,
		fetchPreviousPage,
	} = useInfiniteQuery({
		queryKey,
		queryFn: (page) =>
			getProducts({ ...search, ...browserQuery } as ParsedUrlQuery, page),
		getNextPageParam: ({ meta }) => meta.current_page + 1,
		getPreviousPageParam,
		initialData: 1,
		staleTime: 1000 * 60 * 60,
	});

	console.log("products", products);

	const { isLoading, data } = useQuery({
		queryKey: ["amount", search],
		queryFn: ({ signal }) =>
			getCount({ ...search, ...browserQuery } as ParsedUrlQuery, signal),
	});

	return (
		<>
			<Head>
				<meta name="description" content="Generated by create next app" />
				<meta name="title" content="MyAuto.ge" />
				<link rel="icon" href="/favicon.ico" />
				<title>MyAuto</title>
			</Head>

			<div className="flex flex-col items-start justify-start max-w-[104rem]  mx-auto mt-[3.2rem]">
				<BreadCrumb />

				<div className="flex gap-8 mt-8 w-full">
					<FiltersContainer
						isLoading={isLoading}
						search={search}
						query={query}
						setSearch={setSearch}
						foundAmount={data?.count ?? 0}
					/>

					<main className="flex flex-col flex-1">
						<ProductHeader foundAmount={data?.count ?? 0} />
						<button
							onClick={() => {
								pageRef.current--;
								fetchPreviousPage();
							}}
						>
							prev{" "}
						</button>
						<button
							onClick={() => {
								pageRef.current++;
								fetchNextPage();
							}}
						>
							next{" "}
						</button>
						<section className="flex flex-col md:gap-[1rem] w-full  mt-[1.6rem]">
							{products?.pages[pageRef.current].items?.map((item) => (
								<Card key={item.car_id} item={item} />
							))}
						</section>
					</main>
				</div>
			</div>
		</>
	);
};

export const getServerSideProps = async ({
	query,
}: {
	query: ParsedUrlQuery;
}) => {
	const queryClient = new QueryClient();

	const search = {
		...defaultQueries,
		...query,
	};

	const queryKey = ["amount", search];

	await queryClient.prefetchQuery({
		queryKey,
		queryFn: () => getCount(search as any),
	});

	await queryClient.prefetchInfiniteQuery(
		["prods", search],
		() =>
			getProducts(search as any, {
				pageParam: 1,
			}),
		{
			initialData: {
				pageParams: [1],
				pages: [
					{
						items: [],
						meta: {
							current_page: 0,
							last_page: 1000,
							per_page: 30,
							total: 168000,
						},
					},
				],
			},
		}
	);

	// await queryClient.prefetchInfiniteQuery({
	// 	queryKey: ["prods", search],
	// 	queryFn: (e) =>
	// 		getProducts(search as any, { pageParam: e.pageParam.meta.current_page }),
	// 	initialPageParam: {
	// 		items: [],
	// 		meta: {
	// 			current_page: 0,
	// 			last_page: 1000,
	// 			per_page: 30,
	// 			total: 168000,
	// 		},
	// 	},
	// 	initialData: {
	// 		items: [],
	// 		meta: {
	// 			current_page: 0,
	// 			last_page: 1000,
	// 			per_page: 30,
	// 			total: 168000,
	// 		},
	// 	},
	// });

	return {
		props: {
			query,
			dehydratedState: dehydrate(queryClient),
		},
	};
};

export default Home;
