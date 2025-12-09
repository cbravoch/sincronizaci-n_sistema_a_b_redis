#!/bin/bash
set -e

# Afinar PHP-FPM y OPcache en cada arranque para menor latencia bajo carga
PHP_FPM_WWW_CONF="/usr/local/etc/php-fpm.d/www.conf"
if [ -f "$PHP_FPM_WWW_CONF" ]; then
  sed -i 's/^pm.max_children = .*/pm.max_children = 30/' "$PHP_FPM_WWW_CONF"
  sed -i 's/^pm.start_servers = .*/pm.start_servers = 10/' "$PHP_FPM_WWW_CONF"
  sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 5/' "$PHP_FPM_WWW_CONF"
  sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 15/' "$PHP_FPM_WWW_CONF"
  if grep -q '^pm.max_requests' "$PHP_FPM_WWW_CONF"; then
    sed -i 's/^pm.max_requests = .*/pm.max_requests = 500/' "$PHP_FPM_WWW_CONF"
  else
    echo "pm.max_requests = 500" >> "$PHP_FPM_WWW_CONF"
  fi
fi

cat > /usr/local/etc/php/conf.d/zz-opcache.ini <<'EOF'
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.revalidate_freq=0
opcache.jit=tracing
opcache.jit_buffer_size=64M
EOF

# Iniciar el demonio cron
service cron start

# Configurar el cron job para ejecutar el comando outbox:process cada segundo
# Usamos un bucle para simular la ejecución cada segundo
while true; do
  php /var/www/html/artisan outbox:process
  sleep 1
done &

# Mantener el contenedor en ejecución
exec "$@"
