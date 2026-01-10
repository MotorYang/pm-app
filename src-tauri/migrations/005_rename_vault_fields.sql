-- Rename vault_entries fields: username -> param_key, encrypted_password -> encrypted_value
ALTER TABLE vault_entries RENAME COLUMN username TO param_key;
ALTER TABLE vault_entries RENAME COLUMN encrypted_password TO encrypted_value;
