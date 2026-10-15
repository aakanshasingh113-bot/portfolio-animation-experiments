import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/ComingSoon";
import { projectItems } from "@/data/items";

export function generateStaticParams() {
  return projectItems.map((i) => ({ slug: i.href!.split("/").pop()! }));
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = projectItems.find((i) => i.href === `/work/${slug}`);
  if (!item?.project) notFound();
  return <ComingSoon title={item.project.name} note="Case study template arrives in Phase 2." />;
}
