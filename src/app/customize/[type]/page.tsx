import CustomizerPage from "@/components/customizer/CustomizerPage";
import {
  getClothingModelConfig,
  supportedClothingTypes,
} from "@/types/clothing";

interface CustomizeTypePageProps {
  params: Promise<{
    type: string;
  }>;
}

export function generateStaticParams() {
  return supportedClothingTypes.map((type) => ({ type }));
}

export default async function CustomizeTypePage({ params }: CustomizeTypePageProps) {
  const resolvedParams = await params;
  const modelConfig = getClothingModelConfig(resolvedParams.type);

  if (!modelConfig) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-semibold">Product type not found</h1>
          <p className="mt-3 text-sm text-zinc-400">
            The requested product is not available in the customizer yet.
          </p>
        </div>
      </div>
    );
  }

  return <CustomizerPage modelConfig={modelConfig} />;
}
