"""
数据库连接测试脚本
用于检查 MySQL 连接是否正常
"""
import sys
from config import settings

def test_connection():
    """测试数据库连接"""
    print("=" * 50)
    print("数据库连接测试")
    print("=" * 50)
    print(f"数据库主机: {settings.DB_HOST}")
    print(f"数据库端口: {settings.DB_PORT}")
    print(f"数据库用户: {settings.DB_USER}")
    print(f"数据库名称: {settings.DB_NAME}")
    print(f"密码: {'*' * len(settings.DB_PASSWORD) if settings.DB_PASSWORD else '(空)'}")
    print("-" * 50)
    
    try:
        import pymysql
        
        # 尝试连接数据库
        print("正在尝试连接 MySQL...")
        connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            charset='utf8mb4',
            connect_timeout=5
        )
        
        print("✅ MySQL 连接成功！")
        
        # 检查数据库是否存在
        cursor = connection.cursor()
        cursor.execute("SHOW DATABASES LIKE %s", (settings.DB_NAME,))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ 数据库 '{settings.DB_NAME}' 已存在")
        else:
            print(f"⚠️  数据库 '{settings.DB_NAME}' 不存在，需要执行 init_db.sql 创建")
        
        connection.close()
        return True
        
    except pymysql.err.OperationalError as e:
        error_code, error_msg = e.args
        print(f"❌ MySQL 连接失败！")
        print(f"错误代码: {error_code}")
        print(f"错误信息: {error_msg}")
        print("\n可能的原因：")
        print("1. MySQL 服务未启动")
        print("2. 数据库配置信息不正确（主机、端口、用户名、密码）")
        print("3. MySQL 服务运行在不同的端口")
        print("\n解决方案：")
        print("1. 检查 MySQL 服务是否启动：")
        print("   - Windows: 打开服务管理器，查找 'MySQL' 服务")
        print("   - 或在命令行运行: net start MySQL")
        print("2. 检查 .env 文件中的配置是否正确")
        print("3. 确认 MySQL 端口是否为 3306")
        return False
        
    except ImportError:
        print("❌ 未安装 pymysql 库")
        print("请运行: pip install pymysql")
        return False
        
    except Exception as e:
        print(f"❌ 发生未知错误: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
