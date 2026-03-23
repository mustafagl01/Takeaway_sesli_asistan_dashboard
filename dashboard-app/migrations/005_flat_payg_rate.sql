UPDATE subscriptions
SET payg_rate_pence = 20
WHERE payg_rate_pence IS DISTINCT FROM 20;

UPDATE subscriptions
SET rate_pence = 20
WHERE status = 'pay_as_you_go'
  AND rate_pence IS DISTINCT FROM 20;
