"""Bundle index.html, styles.css and js/*.js into dist/do-not-spill.html (one standalone file)."""
import os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda p: open(os.path.join(root, p), encoding='utf-8').read()

html = read('index.html')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + read('styles.css') + '\n</style>')
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + read(m.group(1)).replace('</script', '<\\/script') + '\n</script>', html)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'do-not-spill.html'), 'w', encoding='utf-8').write(html)
print('wrote dist/do-not-spill.html')
