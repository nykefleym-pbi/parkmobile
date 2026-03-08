CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, block_lot, residence_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'block_lot', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'residence_type', ''), 'Resident')
  );
  
  -- Auto-insert vehicle if provided during signup
  IF NEW.raw_user_meta_data->>'car_name' IS NOT NULL AND NEW.raw_user_meta_data->>'car_plate' IS NOT NULL THEN
    INSERT INTO public.vehicles (user_id, name, plate, color, is_primary)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'car_name',
      NEW.raw_user_meta_data->>'car_plate',
      COALESCE(NEW.raw_user_meta_data->>'car_color', 'White'),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$function$;