@echo off
echo Resetting PostgreSQL password...
echo.
echo This will reset the 'postgres' user password to: postgres123
echo.
pause

"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "ALTER USER postgres PASSWORD 'postgres123';"

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Password has been reset to: postgres123
    echo.
) else (
    echo.
    echo ERROR: Could not reset password. You may need to:
    echo 1. Open pgAdmin
    echo 2. Right-click on postgres user
    echo 3. Choose Properties
    echo 4. Set a new password
    echo.
)

pause
