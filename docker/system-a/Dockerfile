FROM php:8.2-fpm

# Instalar dependencias y cron
RUN apt-get update && apt-get install -y \
    zip unzip git curl libpq-dev libzip-dev libpng-dev cron

# Configurar PHP y extensiones
RUN pecl install redis \
    && docker-php-ext-enable redis

RUN docker-php-ext-install pdo pdo_mysql

# Configurar el directorio de trabajo
WORKDIR /var/www/html

# Copiar los archivos de la aplicación
COPY . .

# Instalar dependencias de Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    && php composer.phar install

# Hacer ejecutable el script de entrada
RUN chmod +x /var/www/html/docker-entrypoint.sh

# Usar el script de entrada personalizado
ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]

# Comando por defecto (se ejecutará después del ENTRYPOINT)
CMD ["php-fpm"]
