USE staynest;

-- Existing installations need an explicit pending state for delegated accounts.
ALTER TABLE agent_subaccounts
  MODIFY status ENUM('pending','active','suspended','revoked') NOT NULL DEFAULT 'pending';

-- Agent users created before this workflow can be reviewed from the admin queue.
-- Do not change already active or suspended accounts.
UPDATE users u
JOIN user_roles ur ON ur.user_id=u.id
JOIN roles r ON r.id=ur.role_id AND r.name='agent'
JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id
SET u.status='pending', sa.status='pending'
WHERE u.status='pending';
