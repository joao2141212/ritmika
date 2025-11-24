-- Function to increment user points
CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET points = points + increment_user_points.points
    WHERE id = increment_user_points.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
