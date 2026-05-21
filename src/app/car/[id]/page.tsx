import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CarDetailClient,
  type CarDetailCar,
} from "@/components/car/CarDetailClient";

export default async function CarPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // В качестве id используем encar_id (он стабильный и уже есть в каталоге).
  const { data: car, error } = await supabase
    .from("cars")
    .select("*")
    .eq("encar_id", params.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase car query error:", error.message);
  }

  if (!car) {
    notFound();
  }

  const { data: similarCars } = await supabase
    .from("cars")
    .select("*")
    .eq("model", car.model)
    .neq("encar_id", car.encar_id)
    .eq("is_available", true)
    .limit(3);

  return (
    <CarDetailClient
      car={car as CarDetailCar}
      similarCars={(similarCars ?? []) as CarDetailCar[]}
    />
  );
}
