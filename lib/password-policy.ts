// Mirrors supabase/config.toml [auth]: minimum_password_length = 8 and
// password_requirements = "lower_upper_letters_digits". Supabase Auth enforces
// it; the forms only show the hint up front.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = "At least 8 characters, with upper and lower case letters and a number.";
