import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const chainId = Number(process.env.CHAIN_ID ?? 84532);
const tokenAddress =
  process.env.ACCEPTED_TOKEN_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

const products = [
  {
    id: "prod_react_saas",
    name: "React SaaS UI Kit",
    slug: "react-saas-ui-kit",
    description: "A polished component kit for dashboards, billing pages, and SaaS onboarding flows.",
    accessUrl: "https://example.com/downloads/react-saas-ui-kit",
    thumbnail: "/products/ui-kit.svg",
    priceAmount: "25000000",
    priceDecimals: 6,
    tokenSymbol: "TEST-USDC",
    tokenAddress,
    chainId
  },
  {
    id: "prod_prompt_pack",
    name: "AI Agent Prompt Pack",
    slug: "ai-agent-prompt-pack",
    description: "Production-minded prompt templates for research agents, code agents, and operations workflows.",
    accessUrl: "https://example.com/downloads/ai-agent-prompt-pack",
    thumbnail: "/products/prompt-pack.svg",
    priceAmount: "15000000",
    priceDecimals: 6,
    tokenSymbol: "TEST-USDC",
    tokenAddress,
    chainId
  },
  {
    id: "prod_web3_template",
    name: "Web3 Starter Template",
    slug: "web3-starter-template",
    description: "A full-stack starter with wallet auth, protected routes, contract calls, and deploy notes.",
    accessUrl: "https://example.com/downloads/web3-starter-template",
    thumbnail: "/products/web3-template.svg",
    priceAmount: "35000000",
    priceDecimals: 6,
    tokenSymbol: "TEST-USDC",
    tokenAddress,
    chainId
  },
    {
    id: "prod_web3_template",
    name: "Designer Figma Kit",
    slug: "designer-figma-kit",
    description: "Are you waiting for a designer? ARE YOU WAITING FOR A DESIGNER? This kit includes pre-made components, icons, and styles to help you design faster.",
    accessUrl: "https://example.com/downloads/designer-figma-kit",
    thumbnail: "/products/figma-kit.jpg",
    priceAmount: "1000000",
    priceDecimals: 6,
    tokenSymbol: "TEST-USDC",
    tokenAddress,
    chainId
  }
];

for (const product of products) {
  await prisma.product.upsert({
    where: { id: product.id },
    create: product,
    update: product
  });
}

await prisma.$disconnect();
