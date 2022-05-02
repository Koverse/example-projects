import os
from setuptools import setup
from setuptools.command.install import install

from notebook.nbextensions import install_nbextension
from notebook.services.config import ConfigManager
from jupyter_core.paths import jupyter_config_dir

EXT_DIR = os.path.join(os.path.dirname(__file__), 'KDP4')


class InstallCommand(install):
    def run(self):
        # Install Python package
        install.run(self)

        # Install JavaScript extensions to ~/.local/jupyter/
        install_nbextension(EXT_DIR, overwrite=True, user=True)

        # Activate the JS extensions on the notebook, tree, and edit screens
        js_cm = ConfigManager()
        js_cm.update('notebook', {"load_extensions": {'KDP4/notebook': True}})
        js_cm.update('tree', {"load_extensions": {'KDP4/dashboard': True}})
        js_cm.update('edit', {"load_extensions": {'KDP4/editor': True}})


setup(
    name='KDP4',
    version='0.5',
    packages=['KDP4'],
    cmdclass={
        'install': InstallCommand
    },
    description="Dockerized KDP4 Jupyter Notebook extension",
    author="Daniel Jin",
)
