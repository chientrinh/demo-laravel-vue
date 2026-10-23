FROM php:8.3-apache

# Install required extensions and dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libxslt1-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip xsl \
    && a2enmod rewrite headers expires

# Set working directory
WORKDIR /var/www/html

# Copy composer and install dependencies
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy composer.json from project root and install
COPY backend/composer.json /var/www/html/composer.json

# Install dependencies (ignore security advisories for development)
ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install --no-interaction --optimize-autoloader --no-dev --ignore-platform-reqs --no-audit 2>/dev/null || true

# Copy entire Laravel project
COPY backend/ /var/www/html

# Copy public directory explicitly (ensures it's included)
COPY backend/public/ /var/www/html/backend/public

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Configure Apache DocumentRoot for Laravel public directory
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf && \
    sed -i 's|<Directory /var/www/html>|<Directory /var/www/html/public>|' /etc/apache2/sites-available/000-default.conf && \
    sed -i '/<Directory \/var\/www\/html\/public>/,/<\/Directory>/a\\n        RewriteEngine On\n        RewriteCond %{REQUEST_FILENAME} !-f\n        RewriteCond %{REQUEST_FILENAME} !-d\n        RewriteRule ^(.*)$ index.php [QSA,L]' /etc/apache2/sites-available/000-default.conf && \
    a2enmod rewrite && \
    grep -q 'AllowOverride All' /etc/apache2/sites-available/000-default.conf || sed -i 's|AllowOverride All|AllowOverride All|' /etc/apache2/sites-available/000-default.conf

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]