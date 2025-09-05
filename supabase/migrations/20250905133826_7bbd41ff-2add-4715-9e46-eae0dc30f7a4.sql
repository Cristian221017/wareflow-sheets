-- Remove NFs órfãs que deveriam ter sido excluídas
DELETE FROM notas_fiscais 
WHERE cliente_id = 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c' 
AND id IN ('213610ed-9660-4f5f-a3cb-35baf4ef36d1', 'ed2adad2-3508-432b-aa29-0dafe87a9191');