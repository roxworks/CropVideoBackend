namespace NodeJS {
  interface ProcessEnv extends NodeJS.ProcessEnv {
    BASE_URL: string;
    NEXT_PUBLIC_BASE_URL: string;
    TWITCH_CLIENT_ID: string;
    TWITCH_CLIENT_SECRET: string;
    JWT_SECRET: string;
    APP_KEY: string;
    FB_REDIRECT_URL: string;
    NEXT_PUBLIC_FB_APP_ID: string;
    FB_APP_SECRET: string;
    TIKTOK_CLIENT_KEY: string;
    TIKTOK_CLIENT_SECRET: string;
    YOUTUBE_SECRETS: string;
    NEXT_PUBLIC_AMP_KEY: string;
    NEXT_PUBLIC_CROP_VIDEO_URL: string;
    NEXT_PUBLIC_CROP_APP_KEY: string;
    PROD_EMAIL: string;
    PROD_EMAIL_PASS: string;
    SENDGRID_API_KEY: string;
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    AXIOM_URL: string;
    AXIOM_TOKEN: string;
  }
}
