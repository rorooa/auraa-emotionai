import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "test_token_replace_me";
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize Mixpanel safely only on the client-side window
if (typeof window !== "undefined") {
    mixpanel.init(MIXPANEL_TOKEN, {
        debug: !IS_PRODUCTION,
        track_pageview: true,
        persistence: 'localStorage'
    });
}

/**
 * Global strongly-typed analytical tracking interface.
 */
export const trackEvent = (eventName: string, props?: Record<string, any>) => {
    if (typeof window !== "undefined") {
        mixpanel.track(eventName, props);
    }
};

/**
 * Bind tracking data to an authorized user UUID securely
 */
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
    if (typeof window !== "undefined") {
        mixpanel.identify(userId);
        if (traits) {
            mixpanel.people.set(traits);
        }
    }
};

/**
 * Commerce abstraction
 */
export const trackCheckoutStep = (stepName: string, value?: number, tier?: string) => {
    trackEvent('Checkout Flow', {
        step: stepName,
        value: value,
        tier: tier
    });
};
