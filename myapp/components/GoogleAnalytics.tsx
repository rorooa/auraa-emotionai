"use client";

import Script from "next/script";

export default function GoogleAnalytics() {
    const ga_id = process.env.NEXT_PUBLIC_GA_ID;

    // Do not mount if no GA Tracker is found in the environment limits
    if (!ga_id) return null;

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${ga_id}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${ga_id}', {
                            page_path: window.location.pathname,
                        });
                    `,
                }}
            />
        </>
    );
}
